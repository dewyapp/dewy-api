FROM centos:7

RUN curl "https://bootstrap.pypa.io/get-pip.py" -o "/tmp/get-pip.py"
RUN python /tmp/get-pip.py

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY requirements.txt /usr/src/app
RUN pip install -r requirements.txt
COPY . /usr/src/app

EXPOSE 8080

CMD ["python", "api.py"]
