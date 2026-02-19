import { useEffect, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

export default function App() {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState(null);
  const [songs, setSongs] = useState([]);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
useEffect(() => {
  const load = async () => {
    ffmpeg.on("progress", ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    await ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
      wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
    });

    setReady(true);
  };

  load();
}, []);


  const mergeSongs = async () => {
    if (!video || songs.length === 0) {
      alert("Upload video + songs");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      await ffmpeg.writeFile("video.mp4", await fetchFile(video));

      for (let i = 0; i < songs.length; i++) {
        await ffmpeg.writeFile(`song${i}.mp3`, await fetchFile(songs[i]));

        await ffmpeg.exec([
          "-i", `song${i}.mp3`,
          "-ac", "2",
          "-ar", "44100",
          `fixed${i}.wav`
        ]);
      }

      let list = "";
      for (let i = 0; i < songs.length; i++) {
        list += `file fixed${i}.wav\n`;
      }

      await ffmpeg.writeFile("list.txt", list);

      await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", "list.txt",
        "-c", "copy",
        "merged.wav"
      ]);

      await ffmpeg.exec([
        "-i", "video.mp4",
        "-i", "merged.wav",
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-shortest",
        "final.mp4"
      ]);

      const data = await ffmpeg.readFile("final.mp4");

      setOutput(
        URL.createObjectURL(
          new Blob([data.buffer], { type: "video/mp4" })
        )
      );

    } catch (err) {
      console.error("FFmpeg error:", err);
      alert("Error while processing video.");
    }

    setLoading(false);
  };

  const downloadVideo = () => {
    const a = document.createElement("a");
    a.href = output;
    a.download = "final-video.mp4";
    a.click();
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>🎬 Siva Video Music Merger</header>

      <div style={styles.layout}>
        <div style={styles.panel}>
          <h3>How it works</h3>

          <ul>
            <li>Upload video</li>
            <li>Add multiple songs</li>
            <li>Songs auto play in sequence</li>
            <li>No quality loss</li>
          </ul>

          <input
            type="file"
            accept="video/*"
            onChange={e => setVideo(e.target.files[0])}
          />

          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={e => setSongs([...e.target.files])}
          />

          {songs.map((s, i) => (
            <div key={i}>🎵 {s.name}</div>
          ))}

          <button onClick={mergeSongs} disabled={!ready || loading}>
            {loading ? "Processing..." : "Merge Songs"}
          </button>

          {loading && (
            <progress
              value={progress}
              max="100"
              style={{ width: "100%" }}
            />
          )}
        </div>

        <div style={styles.preview}>
          {output ? (
            <>
              <video
                src={output}
                controls
                style={{
                  width: "100%",
                  height: "80vh",
                  objectFit: "contain"
                }}
              />
              <button onClick={downloadVideo} style={styles.download}>
                ⬇ Download
              </button>
            </>
          ) : (
            <div style={styles.placeholder}>
              Video preview will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    width: "100vw",
    background: "#020617",
    color: "white",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    padding: 14,
    fontSize: 22,
    background: "#020617",
    borderBottom: "1px solid #1e293b"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    height: "100%"
  },
  panel: {
    padding: 20,
    borderRight: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  preview: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  placeholder: {
    opacity: 0.5,
    fontSize: 20
  },
  download: {
    marginTop: 12,
    background: "#22c55e",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: "bold",
    cursor: "pointer"
  }
};
