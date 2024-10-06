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
} from "lucide-react";

// Initialize socket connection
const socket = io("http://localhost:3001");

const TextTruncate = ({ text, maxLength = 5 }) => (
  <span className="block truncate" title={text}>
    {text.length > maxLength ? `${text.substring(0, maxLength)}...` : text}
  </span>
);

const TaskItem = ({ task, onViewResult, onDownload }) => {
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
      {task.status === "completed" && (
        <div className="flex space-x-2">
          <button
            onClick={() => onViewResult(task)}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors flex items-center text-sm"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            View Results
          </button>
          <button
            onClick={() => onDownload(task)}
            className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      )}
    </div>
  );
};

const ResultModal = ({ task, onClose }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
        Results for Task {task.id.substring(0, 8)}
      </h3>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <XCircle className="w-6 h-6" />
      </button>
    </div>
    <div className="prose dark:prose-invert">
      {task.result ? (
        <div
          className="whitespace-pre-wrap"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        >
          {task.result}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          No results available for this task.
        </p>
      )}
    </div>
  </div>
);

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [outputFormat, setOutputFormat] = useState("docx");
  const [isConnected, setIsConnected] = useState(socket.connected);

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

    socket.on("downloadReady", ({ taskId, fileContent, format }) => {
      const blob = new Blob([Buffer.from(fileContent, "base64")], {
        type: `application/${format}`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `result.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("taskCompleted");
      socket.off("taskError");
      socket.off("downloadReady");
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

      // Immediately add the task to the UI
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
    socket.emit("downloadResult", { taskId: task.id, format: outputFormat });
  };

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "dark" : ""}`}>
      <div className="flex-grow bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                Concurrent Prompt Engine
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Status:{" "}
                {isConnected ? (
                  <span className="text-green-500">Connected</span>
                ) : (
                  <span className="text-red-500">Disconnected</span>
                )}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200"
            >
              {isDarkMode ? (
                <Sun className="text-yellow-500" />
              ) : (
                <Moon className="text-gray-500" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-hidden">
            <div className="flex flex-col">
              <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 transition-all duration-200"
              >
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-colors duration-200"
                  rows="4"
                />
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center">
                    <label className="cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center">
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Upload File
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    {selectedFile && (
                      <div className="ml-4 flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                        <File className="w-4 h-4 mr-2" />
                        <TextTruncate text={selectedFile.name} maxLength={7} />
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="ml-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="mr-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full"
                    >
                      <option value="docx">DOCX</option>
                      <option value="pdf">PDF</option>
                      <option value="txt">Plain Text</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!isConnected}
                      className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Submit
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-grow overflow-y-auto transition-all duration-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                  Concurrent Tasks
                </h2>
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onViewResult={handleViewResult}
                    onDownload={handleDownload}
                  />
                ))}
                {tasks.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    No tasks yet. Submit a prompt to start processing!
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                Results
              </h2>
              {selectedTask ? (
                <ResultModal
                  task={selectedTask}
                  onClose={() => setSelectedTask(null)}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No tasks yet. Submit a prompt to start processing!
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
