
# Concurrent Prompt Engine Web Application

A web application designed to handle multiple user-defined tasks concurrently, powered by Node.js, Express, React, Redis, Socket.io, Bull queue, and OpenAI’s Language Model (LLM). This application allows users to execute prompt-based tasks in real-time, generating consistent and high-quality outputs, which can be downloaded individually or as a merged document.

## Table of Contents

- [Purpose](#purpose)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Purpose

The goal of this application is to create a concurrent prompt engine that efficiently manages multiple prompt-driven tasks at once, ensuring high-quality output guided by a system prompt. The application can download each task's result separately or combine all results into a single file.

## Features

- **Concurrent Task Processing**: With Redis and Bull Queue, tasks are processed in real-time with efficient queue management.
- **Real-Time Updates**: Socket.io provides real-time task status updates and notifications to users.
- **Flexible Input Options**: Users can submit tasks with prompts, subject matter, or documents as inputs.
- **Standardized Output**: A single system prompt ensures consistent output style, similar to ChatGPT responses.
- **Output Options**: Users can download individual task outputs or opt for a merged document.

## Tech Stack

- **Backend**: Node.js, Express, Redis, Bull Queue
- **Frontend**: React, Socket.io
- **LLM Integration**: OpenAI Language Model

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/concurrent-prompt-engine.git
   cd concurrent-prompt-engine
   ```

2. Install dependencies for both frontend and backend:

   ```bash
   # Backend setup
   cd backend
   npm install

   # Frontend setup
   cd ../frontend
   npm install
   ```

3. Set up Redis and environment variables:
   - Install Redis (refer to [Redis installation guide](https://redis.io/docs/getting-started/installation/)).
   - Create a `.env` file in the backend folder with the following:

     ```plaintext
     PORT=5000
     NODE_ENV=development
     REDIS_URL=redis://localhost:6379
     OPENAI_API_KEY=your_openai_api_key
     ```

4. Start the application:

   ```bash
   # Start Redis server
   redis-server

   # Backend (in one terminal)
   cd backend
   npm run start

   # Frontend (in another terminal)
   cd frontend
   npm start
   ```

## Usage

1. Navigate to `http://localhost:3000` in your browser.
2. Enter your prompt and upload any documents (if applicable).
3. Monitor the task status in real-time as each prompt is processed.
4. Download individual task outputs or a merged document.

## API Endpoints

- **POST `/api/task`**: Add a new task with a prompt and document(s). Tasks are queued in Bull and processed concurrently.
- **GET `/api/tasks`**: Retrieve all tasks with their statuses, updated in real-time via Socket.io.
- **GET `/api/output/:id`**: Download the result of a specific task or the merged output of all tasks.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

## License

Distributed under the MIT License. See `LICENSE` for more information.
