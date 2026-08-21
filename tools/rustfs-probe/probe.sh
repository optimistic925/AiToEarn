#!/bin/sh
set -eu

: "${AWS_ACCESS_KEY_ID:?missing AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?missing AWS_SECRET_ACCESS_KEY}"
: "${S3_ENDPOINT:?missing S3_ENDPOINT}"
: "${S3_BUCKET:?missing S3_BUCKET}"

KEY="command-center-rustfs-probe-$(date +%s)-$$.txt"
CREATED=0

cleanup() {
  if [ "$CREATED" = "1" ]; then
    aws --endpoint-url "$S3_ENDPOINT" \
      s3api delete-object \
      --bucket "$S3_BUCKET" \
      --key "$KEY" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

printf 'AiToEarn RustFS probe\n' > /tmp/source.txt

echo "RUSTFS_PROBE_START"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api put-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" \
  --body /tmp/source.txt >/dev/null

CREATED=1
echo "RUSTFS_PUT=PASS"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api get-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" \
  /tmp/result.txt >/dev/null

echo "RUSTFS_GET=PASS"

cmp /tmp/source.txt /tmp/result.txt

echo "RUSTFS_CONTENT_INTEGRITY=PASS"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api delete-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" >/dev/null

CREATED=0
echo "RUSTFS_DELETE=PASS"

if aws --endpoint-url "$S3_ENDPOINT" \
  s3api head-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" >/dev/null 2>/tmp/head.err; then
  echo "RUSTFS_DELETE_VERIFY=FAIL"
  echo "ERROR: probe object still exists after delete"
  exit 1
fi

if grep -Eqi 'NoSuchKey|An error occurred \(404\) when calling the HeadObject operation: Not Found' /tmp/head.err; then
  if aws --endpoint-url "$S3_ENDPOINT" \
    s3api head-bucket \
    --bucket "$S3_BUCKET" >/dev/null 2>/tmp/bucket.err; then
    echo "RUSTFS_DELETE_VERIFY=PASS"
  else
    echo "RUSTFS_DELETE_VERIFY=FAIL"
    echo "ERROR: object was not found, but bucket/endpoint verification failed"
    exit 1
  fi
else
  echo "RUSTFS_DELETE_VERIFY=FAIL"
  echo "ERROR: delete verification request failed for a reason other than object-not-found"
  exit 1
fi

echo "RUSTFS_PROBE=PASS"

sleep 20
