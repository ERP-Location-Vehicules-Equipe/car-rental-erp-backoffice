FROM python:3.10

WORKDIR /app

# 👇 مهم باش Docker cache يخدم مزيان
COPY requirements.txt .

# 👇 هنا كتنصّب جميع dependencies
RUN pip install --no-cache-dir --default-timeout=180 --retries 10 -r requirements.txt

# 👇 من بعد تنسخ المشروع كامل
COPY . .

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
