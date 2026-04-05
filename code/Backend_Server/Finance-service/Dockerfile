# Python image
FROM python:3.11-slim

# working directory
WORKDIR /app

# copy requirements
COPY requirements.txt .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY . .

# expose port
EXPOSE 8001

# start fastapi
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
