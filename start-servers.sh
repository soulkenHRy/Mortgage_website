#!/bin/bash

# Start Backend Server
echo "Starting Backend Server..."
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start Frontend Server
echo "Starting Frontend Server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "Both servers are running!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to press Ctrl+C
wait
