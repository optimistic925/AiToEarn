FROM python:3.12-alpine@sha256:45a40c0f1e6921a68852e12b0d01782d33b5403bfc3cf0a23f2a89c97b9eae01

COPY fingerprint.py /usr/local/bin/rustfs-credential-fingerprint
RUN chmod 0555 /usr/local/bin/rustfs-credential-fingerprint

ENTRYPOINT ["python3", "/usr/local/bin/rustfs-credential-fingerprint"]
