# Rythm 4

## Awesome Discord Music Bot

Inspired by [Rythm](https://rythm.fm/)

Alternative: [rythm5](https://github.com/szczursonn/rythm5) (slower but more stable, relies on `yt-dlp`)

## Requirements (if not using Docker)

- [Node.js](https://nodejs.org/) >=24 and <=26.10.0 [(26.11.0 introduced a bug)](https://github.com/nodejs/node/pull/66596)
- [ffmpeg](https://www.ffmpeg.org/) on PATH

## Setup

1. Create `data` directory
2. Create `config.toml` in `data`:

```toml
# Minimal config
[[clients]]
token = "<discord token>"
```

## Running with Docker as a service

1. Ensure `data` is writable by uid `1000` (`sudo chown -R 1000:1000 data`)
2. Build the image

```sh
docker build -t rythm4 .
```

3. Start the service

```sh
docker run -d --name rythm4 --restart on-failure -v ./data:/data rythm4
```

## Running directly

1. Install dependencies

```sh
npm i
```

2. Run

```sh
node src/entrypoint.ts
```

## Innertube notes (what shenanigans is Google up to as of the current version)

- `WEB`, `MWEB` are SABR-only (unsupported yet)
- `WEB_REMIX` (default) returns direct URLs without PO tokens (PO tokens enabled by default anyway for future compatibility)
- `TVHTML5_SIMPLY`, `iOS` seem to be returning direct URLs too, not tested extensively
- `VISIONOS` works great if not using a VPS, otherwise Google recognizes the app as a bot immediately

## TODO

- youtube: SABR support
- youtube: prefer just songs over music videos in search
- spotify-like fade transitions when one track ends and another one starts
- end session if alone in voice channel for long time
