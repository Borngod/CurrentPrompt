const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Queue = require("bull");
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");
const officegen = require("officegen");
const PDFDocument = require("pdfkit");
const os = require("os");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Update this to match your frontend URL
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Configure OpenAI
const openai = new OpenAI({
  apiKey: toString(process.env.OPENAI_API_KEY), // Set this in your environment variables
});

// Create a Bull queue
const taskQueue = new Queue("taskQueue", process.env.REDIS_URL || "redis://127.0.0.1:6379");

// System prompt
const systemPrompt = `You are an intelligent assistant tasked with generating professional, coherent, and accurate responses based on user inputs. Maintain a formal tone, ensure clarity in communication, and adhere to the style guidelines typical of ChatGPT responses.`;

// Function to process tasks with GPT-4
const processWithGPT4 = async (prompt, files = []) => {
  try {
    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    for (const file of files) {
      const fileType = path.extname(file.name).toLowerCase();
      if ([".jpg", ".jpeg", ".png"].includes(fileType)) {
        const base64Image = Buffer.from(file.data).toString("base64");
        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        });
      } else {
        const fileContent = Buffer.from(file.data).toString("utf8");
        messages.push({
          role: "user",
          content: `File content (${file.name}):\n${fileContent}`,
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 1000,
    });

    return {
      type: "text",
      content: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error in GPT-4 processing:", error);
    throw error;
  }
};

// Process tasks in the queue
taskQueue.process(async (job) => {
  try {
    return await processWithGPT4(job.data.prompt, job.data.files);
  } catch (error) {
    console.error("Error processing job:", error);
    throw error;
  }
});

// Function to generate file in specified format
const generateFile = async (content, format) => {
  const tempDir = os.tmpdir();
  const fileName = `output_${Date.now()}`;
  const filePath = path.join(tempDir, fileName);

  switch (format) {
    case "docx":
      const docx = officegen("docx");
      docx.createP().addText(content);
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(`${filePath}.docx`);
        out.on("error", reject);
        out.on("close", resolve);
        docx.generate(out);
      });
      return `${filePath}.docx`;

    case "pdf":
      const pdf = new PDFDocument();
      pdf.text(content);
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(`${filePath}.pdf`);
        out.on("error", reject);
        out.on("finish", resolve);
        pdf.pipe(out);
        pdf.end();
      });
      return `${filePath}.pdf`;

    default: // plain text
      await fs.writeFile(`${filePath}.txt`, content);
      return `${filePath}.txt`;
  }
};

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("submitTask", async (data) => {
    try {
      const taskId = uuidv4();
      const job = await taskQueue.add({
        id: taskId,
        prompt: data.prompt,
        files: data.files,
        userId: socket.id,
      });

      socket.emit("taskSubmitted", { id: taskId, status: "processing" });

      job.finished()
        .then((result) => {
          socket.emit("taskCompleted", {
            id: taskId,
            result: result,
            prompt: data.prompt,
            status: "completed"
          });
        })
        .catch((error) => {
          console.error("Job failed:", error);
          socket.emit("taskError", {
            id: taskId,
            error: "Task processing failed",
            status: "error"
          });
        });
    } catch (error) {
      console.error("Error submitting task:", error);
      socket.emit("taskError", {
        id: null,
        error: "Failed to submit task",
        status: "error"
      });
    }
  });

  socket.on("downloadResult", async (data) => {
    try {
      const { taskId, format } = data;
      const job = await taskQueue.getJob(taskId);
      if (!job) {
        throw new Error("Task not found");
      }

      const result = await job.finished();
      const filePath = await generateFile(result.content, format);

      const fileContent = await fs.readFile(filePath);
      socket.emit("downloadReady", { taskId, fileContent: fileContent.toString('base64'), format });

      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error in downloadResult:", error);
      socket.emit("downloadError", {
        error: "Failed to generate download file",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));