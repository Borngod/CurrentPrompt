const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Queue = require("bull");
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
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
    credentials: true,
  },
});

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in your environment variables
});

// Create Bull queues
const taskQueue = new Queue("taskQueue", "redis://127.0.0.1:6379");
const fileGenerationQueue = new Queue(
  "fileGenerationQueue",
  "redis://127.0.0.1:6379"
);

// System prompt
const systemPrompt = `You are an intelligent assistant tasked with generating professional, coherent, and accurate responses based on user inputs. Maintain a formal tone, ensure clarity in communication, and adhere to the style guidelines typical of ChatGPT responses.`;
taskQueue.on("error", (error) => {
  console.error("Task queue error:", error);
});

fileGenerationQueue.on("error", (error) => {
  console.error("File generation queue error:", error);
});
// Function to process tasks with GPT-4
const processWithGPT4 = async (prompt, files = []) => {
  try {
    let messages = [{ role: "system", content: systemPrompt }];

    // Process files if present
    for (const file of files) {
      const fileContent = Buffer.from(file.data).toString("utf8");
      messages.push({
        role: "user",
        content: `File content (${file.name}):\n${fileContent}`,
      });
    }

    // Add user prompt
    messages.push({ role: "user", content: prompt });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Using the latest GPT-4 model
      messages: messages,
      max_tokens: 1000,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response from GPT-4");
    }
    console.log(response.choices[0].message.content);
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
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Task processing timed out"));
    }, 60000); // 60 seconds timeout

    try {
      const result = await processWithGPT4(job.data.prompt, job.data.files);
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
});

const log = (message, level = "info") => {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`);
};

process.on("SIGTERM", async () => {
  log("SIGTERM received. Shutting down gracefully.");
  await taskQueue.close();
  await fileGenerationQueue.close();
  server.close(() => {
    log("HTTP server closed.");
    process.exit(0);
  });
});
// Function to generate file in specified format
// Function to generate file in specified format
const generateFile = async (content, format) => {
  const tempDir = os.tmpdir();
  const fileName = `output_${Date.now()}`;
  const filePath = path.join(tempDir, fileName);

  try {
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
  } catch (error) {
    console.error("Error in file generation:", error);
    throw error;
  }
};

// Process file generation tasks
fileGenerationQueue.process(async (job) => {
  try {
    const { content, format } = job.data;
    const filePath = await generateFile(content, format);

    // Use fsPromises.readFile instead of fs.readFile for async/await compatibility
    const fileContent = await fsPromises.readFile(filePath); 

    // Delete the temporary file
    await fsPromises.unlink(filePath);

    return { fileContent: fileContent.toString("base64"), format };
  } catch (error) {
    console.error("Error in file generation queue process:", error);
    throw error;
  }
});

// Catch job failures for better debugging
fileGenerationQueue.on("failed", (job, err) => {
  console.error(`File generation job ${job.id} failed with error:`, err);
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("submitTask", async (data) => {
    try {
      // const  = uuidv4();
      const job = await taskQueue.add({
        id: data.id,
        prompt: data.prompt,
        files: data.files,
        userId: socket.id,
      });

      socket.emit("taskSubmitted", { id: data.id, status: "processing" });

      job
        .finished()
        .then((result) => {
          socket.emit("taskCompleted", {
            id: data.id,
            result: result,
            prompt: data.prompt,
            status: "completed",
          });
        })
        .catch((error) => {
          console.error("Job failed:", error);
          socket.emit("taskError", {
            id: data.id,
            error: "Task processing failed: " + error.message,
            status: "error",
          });
        });
    } catch (error) {
      console.error("Error submitting task:", error);
      socket.emit("taskError", {
        id: data.id,
        error: "Failed to submit task: " + error.message,
        status: "error",
      });
    }
  });

  socket.on("generateFile", async (data) => {
    try {
      const { taskId, content, format } = data;

      const job = await fileGenerationQueue.add({
        id: taskId,
        content,
        format,
        userId: socket.id,
      });

      socket.emit("fileGenerationSubmitted", {
        id: taskId,
        status: "processing",
      });

      job
        .finished()
        .then((result) => {
          socket.emit("fileGenerationCompleted", {
            id: taskId,
            ...result,
            status: "completed",
          });
        })
        .catch((error) => {
          console.error("File generation failed:", error);
          socket.emit("fileGenerationError", {
            id: taskId,
            error: "File generation failed: " + error.message,
            status: "error",
          });
        });
    } catch (error) {
      console.error("Error submitting file generation task:", error);
      socket.emit("fileGenerationError", {
        id: data.taskId,
        error: "Failed to submit file generation task: " + error.message,
        status: "error",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
