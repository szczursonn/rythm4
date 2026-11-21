# Rythm 4

## Awesome Discord Music Bot

Inspired by [Rythm](https://rythm.fm/)

## Requirements (if not using Docker)

- [Node.js](https://nodejs.org/) >=24 and <=26.10.0 [(26.11.0 introduced a bug)](https://github.com/nodejs/node/pull/66596)
- [ffmpeg](https://www.ffmpeg.org/) on PATH

## Running with Docker

Create `config.toml` in a `data` directory, then:

```sh
docker build -t rythm4 .
docker run -d --name rythm4 --restart on-failure -v ./data:/data rythm4
```

`data` must be writable by the uid `1000`. (`sudo chown -R 1000:1000 data`)

### Innertube notes (what shenanigans is Google up to as of the current version)

- `WEB`, `MWEB` are SABR-only (unsupported yet, todo)
- `WEB_REMIX` (default) returns direct URLs without PO tokens (PO tokens enabled by default anyway for future compatibility)
- `TVHTML5_SIMPLY`, `iOS` seem to be returning direct URLs too, not tested extensively
