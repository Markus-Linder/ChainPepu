FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY chainpepu ./chainpepu
CMD ["python", "-m", "chainpepu"]
