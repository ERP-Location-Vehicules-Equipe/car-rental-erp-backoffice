FROM python:3.11-slim

# working directory
WORKDIR /app

# copy requirements
COPY requirements.txt .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY . .

<<<<<<<< HEAD:code/Backend_Server/Report-service/Dockerfile
# ✅ logo doit être ici avant CMD
COPY logo.png /app/logo.png

# lancer server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
========
# expose port
EXPOSE 8001

# start fastapi
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
>>>>>>>> meryem:code/Backend_Server/Finance-service/Dockerfile
