# Base Python image
FROM python:3.11-slim

# Avoid stdout buffering
ENV PYTHONUNBUFFERED=1

# Working directory
WORKDIR /app


# Copy requirements first for caching
COPY requirements.txt .


RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy full project
COPY . .

# Expose FastAPI port
EXPOSE 8080

# Start FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
