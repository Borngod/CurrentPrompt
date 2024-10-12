import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  PlusCircle,
  Send,
  Loader,
  CheckCircle,
  XCircle,
  Moon,
  Sun,
  MessageSquare,
  File,
  Trash2,
  Download,
  StopCircle,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";

// Initialize socket connection
const socket = io("http://localhost:3001");

const TextTruncate = ({ text, maxLength = 10 }) => (
  <span className="block truncate" title={text}>
    {text.length > maxLength ? `${text.substring(0, maxLength)}...` : text}
  </span>
);

const TaskItem = ({ task, onViewResult, onDownload, onRetry, onStop }) => {
  let statusIcon;
  switch (task.status) {
    case "processing":
      statusIcon = <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      break;
    case "completed":
      statusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
      break;
    case "error":
      statusIcon = <XCircle className="w-5 h-5 text-red-500" />;
      break;
    default:
      statusIcon = null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 transition-all hover:shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {statusIcon}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Task {task.id.substring(0, 8)}
          </span>
        </div>
        <span
          className={`text-sm ${
            task.status === "processing"
              ? "text-blue-500"
              : task.status === "completed"
              ? "text-green-500"
              : task.status === "error"
              ? "text-red-500"
              : "text-gray-500"
          } dark:text-gray-400`}
        >
          {task.status}
        </span>
      </div>
      <div className="mb-2">
        <p className="text-gray-600 dark:text-gray-300">
          <TextTruncate text={task.prompt} maxLength={100} />
        </p>
        {task.fileName && (
          <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
            <File className="w-4 h-4 mr-2" />
            <TextTruncate text={task.fileName} maxLength={30} />
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onViewResult(task)}
          className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors flex items-center text-sm"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          View Results
        </button>
        {task.status === "completed" && (
          <button
            onClick={() => onDownload(task)}
            className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        )}
        {task.status === "error" && (
          <button
            onClick={() => onRetry(task)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-colors flex items-center text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        )}
        {task.status === "processing" && (
          <button
            onClick={() => onStop(task)}
            className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors flex items-center text-sm"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        <Copy size={16} />
      </button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        className="rounded-md !mt-0"
      >
        {value}
      </SyntaxHighlighter>
      {copied && (
        <span className="absolute top-2 right-12 text-sm text-green-400">
          Copied!
        </span>
      )}
    </div>
  );
};

const ResultView = ({ task }) => {
  return (
    <div className="w-full max-w-3xl mx-auto overflow-x-auto px-2">
      <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl min-w-full">
        {task.result ? (
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <CodeBlock
                    language={match[1]}
                    value={String(children).replace(/\n$/, "")}
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => (
                <p className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">
                  {children}
                </p>
              ),
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium mb-3 text-gray-700 dark:text-gray-200">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-700 dark:text-gray-300">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2 mb-4 italic text-gray-600 dark:text-gray-400">
                  {children}
                </blockquote>
              ),
            }}
            className="text-gray-800 dark:text-gray-200 font-sans"
          >
            {task.result.content}
          </ReactMarkdown>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No results available for this task.
          </p>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [outputFormat, setOutputFormat] = useState("docx");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener("change", handleChange);

    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("taskCompleted", (completedTask) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === completedTask.id
            ? { ...task, ...completedTask, status: "completed" }
            : task
        )
      );
    });

    socket.on("taskError", (errorTask) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === errorTask.id
            ? { ...task, ...errorTask, status: "error" }
            : task
        )
      );
    });

    socket.on("fileGenerationCompleted", ({ taskId, fileContent, format }) => {
      const blob = new Blob([Buffer.from(fileContent, "base64")], {
        type: `application/${format}`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `result.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      setIsDownloading(false); // Hide loader after download completes
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("taskCompleted");
      socket.off("taskError");
      socket.off("fileGenerationCompleted");
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConnected) {
      alert("Not connected to server. Please try again later.");
      return;
    }

    if (prompt.trim() || selectedFile) {
      const taskId = Math.random().toString(36).substring(7);
      const newTask = {
        id: taskId,
        prompt: prompt.trim(),
        status: "processing",
        fileName: selectedFile?.name,
      };

      setTasks((prevTasks) => [newTask, ...prevTasks]);

      const taskData = {
        id: taskId,
        prompt: prompt.trim(),
      };

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileData = {
            name: selectedFile.name,
            data: e.target.result,
          };
          socket.emit("submitTask", { ...taskData, files: [fileData] });
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        socket.emit("submitTask", taskData);
      }

      setPrompt("");
      setSelectedFile(null);
    }
  };

  const handleViewResult = (task) => {
    setSelectedTask(task);
  };

  const handleDownload = (task) => {
    setIsDownloading(true);
    socket.emit("generateFile", {
      taskId: task.id,
      content: task.result.content,
      format: outputFormat,
    });
  };

  const handleRetry = (task) => {
    socket.emit("retryTask", { taskId: task.id });
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, status: "processing" } : t
      )
    );
  };

  const handleStop = (task) => {
    socket.emit("stopTask", { taskId: task.id });
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === task.id ? { ...t, status: "stopped" } : t))
    );
  };

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Concurrent Prompt Engine
            </h1>
            <div className="flex items-center space-x-4">
              <span
                className={`text-sm ${
                  isConnected ? "text-green-500" : "text-red-500"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="text-yellow-500" />
                ) : (
                  <Moon className="text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-colors duration-200"
                rows="4"
              />
              <div className="flex justify-between items-center mt-4">
                <label className="cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Upload File
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors duration-200 flex items-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Submit
                </button>
              </div>
              {selectedFile && (
                <div className="mt-4 flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                  <File className="w-4 h-4 mr-2" />
                  <TextTruncate text={selectedFile.name} maxLength={20} />
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Tasks
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-all duration-200"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Task {task.id.substring(0, 8)}
                      </span>
                      <span
                        className={`text-sm ${
                          task.status === "processing"
                            ? "text-blue-500"
                            : task.status === "completed"
                            ? "text-green-500"
                            : task.status === "error"
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      <TextTruncate text={task.prompt} maxLength={50} />
                    </p>
                    <div className="flex space-x-2">
                      {task.status === "processing" && (
                        <button
                          onClick={() => handleStop(task)}
                          className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors duration-200 flex items-center"
                        >
                          <StopCircle className="w-4 h-4 mr-1" />
                          Stop
                        </button>
                      )}
                      {task.status === "completed" && (
                        <button
                          onClick={() => handleViewResult(task)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600 transition-colors duration-200 flex items-center"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          View Results
                        </button>
                      )}
                      {task.status === "error" && (
                        <button
                          onClick={() => handleRetry(task)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm hover:bg-yellow-600 transition-colors duration-200 flex items-center"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Results
                </h2>
                {selectedTask && selectedTask.status === "completed" && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-colors duration-200"
                    >
                      <option value="docx">DOCX</option>
                      <option value="pdf">PDF</option>
                      <option value="txt">TXT</option>
                    </select>
                    <button
                      onClick={() => handleDownload(selectedTask)}
                      className="bg-green-500 text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors duration-200 flex items-center"
                      disabled={isDownloading} // Disable button while downloading
                    >
                      {isDownloading ? (
                        <Loader className="w-4 h-4 mr-1 animate-spin" /> // Show loader
                      ) : (
                        <Download className="w-4 h-4 mr-1" /> // Show download icon when not downloading
                      )}
                      {isDownloading ? "Downloading..." : "Download"}
                    </button>
                  </div>
                )}
              </div>
              {selectedTask ? (
                <ResultView task={selectedTask} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Select a task to view results
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
