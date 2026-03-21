FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o lpnfuel .

FROM alpine:3.19
RUN apk add --no-cache tzdata ca-certificates chromium

# chromedp needs to find Chrome
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

WORKDIR /app
COPY --from=builder /app/lpnfuel .
COPY db/migrations/ db/migrations/

EXPOSE 8080
CMD ["./lpnfuel"]
