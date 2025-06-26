# Dockerfile for FastAPI Battleship backend

FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc netcat && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy reqs and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Expose backend API port
EXPOSE 3001

# Uvicorn startup script
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "3001", "--reload"]
