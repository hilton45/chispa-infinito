import { writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

/**
 * Generates a 100% procedural 32x32 32-bit BGRA Windows .ico file (zero external assets)
 * and compiles a native Windows GUI executable (CHISPA-Infinito.exe) using Windows' built-in csc.exe.
 */
function generateProceduralIcon(icoPath: string): void {
  const width = 32;
  const height = 32;
  const pixelDataSize = width * height * 4;
  const maskRowBytes = Math.ceil(width / 32) * 4;
  const maskDataSize = maskRowBytes * height;
  const bmpHeaderSize = 40;
  const imageSize = bmpHeaderSize + pixelDataSize + maskDataSize;

  const buf = Buffer.alloc(6 + 16 + imageSize);

  // ICONDIR header (6 bytes)
  buf.writeUInt16LE(0, 0); // Reserved
  buf.writeUInt16LE(1, 2); // Type: 1 = ICO
  buf.writeUInt16LE(1, 4); // Count: 1 image

  // ICONDIRENTRY (16 bytes)
  buf.writeUInt8(width, 6);
  buf.writeUInt8(height, 7);
  buf.writeUInt8(0, 8); // Color palette
  buf.writeUInt8(0, 9); // Reserved
  buf.writeUInt16LE(1, 10); // Color planes
  buf.writeUInt16LE(32, 12); // Bits per pixel
  buf.writeUInt32LE(imageSize, 14); // Image size
  buf.writeUInt32LE(22, 18); // Offset to BMP data

  // BITMAPINFOHEADER (40 bytes)
  const bmpOffset = 22;
  buf.writeUInt32LE(bmpHeaderSize, bmpOffset);
  buf.writeInt32LE(width, bmpOffset + 4);
  buf.writeInt32LE(height * 2, bmpOffset + 8); // Height * 2 for XOR + AND masks
  buf.writeUInt16LE(1, bmpOffset + 12); // Planes
  buf.writeUInt16LE(32, bmpOffset + 14); // BitCount
  buf.writeUInt32LE(0, bmpOffset + 16); // Compression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize + maskDataSize, bmpOffset + 20);

  // Draw procedural bioluminescent Spark Core icon (bottom-up rows)
  const pixelsOffset = bmpOffset + bmpHeaderSize;
  const cx = 15.5;
  const cy = 15.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / 16.0;
      const angle = Math.atan2(dy, dx);

      // Rounded cosmic background circle
      if (d > 0.96) {
        const idx = pixelsOffset + (y * width + x) * 4;
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base dark space (#05040f)
      let r = 8;
      let g = 6;
      let b = 22;

      // Rotating rays + corona
      const rays = Math.max(0, Math.sin(angle * 6)) * Math.max(0, 1 - d);
      const corona = Math.min(1.5, Math.pow(0.18 / Math.max(0.08, d), 1.35));
      const core = d < 0.28 ? 1.0 : d < 0.34 ? (0.34 - d) / 0.06 : 0.0;

      // Plasma cyan-blue + warm white core
      r = Math.min(255, Math.round(r + corona * 65 + rays * 90 + core * 255));
      g = Math.min(255, Math.round(g + corona * 185 + rays * 160 + core * 255));
      b = Math.min(255, Math.round(b + corona * 255 + rays * 220 + core * 255));

      const idx = pixelsOffset + (y * width + x) * 4;
      buf[idx] = b; // Blue
      buf[idx + 1] = g; // Green
      buf[idx + 2] = r; // Red
      buf[idx + 3] = 255; // Alpha
    }
  }

  writeFileSync(icoPath, buf);
}

const CSHARP_SOURCE = `using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace ChispaLauncher
{
    static class Program
    {
        private static string DistRoot;

        [STAThread]
        static void Main()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            DistRoot = Path.Combine(exeDir, "dist");

            if (!Directory.Exists(DistRoot) || !File.Exists(Path.Combine(DistRoot, "index.html")))
            {
                MessageBox.Show(
                    "No se encontró la carpeta 'dist/index.html'. Ejecuta 'npm run build' primero.",
                    "CHISPA ∞",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Use a fixed port first so localStorage save data is preserved across sessions
            int port = 45820;
            TcpListener listener = null;
            for (int attempt = 0; attempt < 15; attempt++)
            {
                try
                {
                    listener = new TcpListener(IPAddress.Loopback, port);
                    listener.Start();
                    break;
                }
                catch
                {
                    port++;
                    listener = null;
                }
            }

            if (listener == null)
            {
                MessageBox.Show("No se pudo iniciar el servidor local.", "CHISPA ∞", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            Thread serverThread = new Thread(() => ServeLoop(listener));
            serverThread.IsBackground = true;
            serverThread.Start();

            string url = "http://127.0.0.1:" + port + "/";
            Process browserProc = LaunchAppWindow(url);

            if (browserProc != null)
            {
                // Because we use a dedicated --user-data-dir, browserProc stays alive
                // for the exact lifetime of the game window, and closes when the window closes.
                browserProc.WaitForExit();
            }
        }

        private static Process LaunchAppWindow(string url)
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string profileDir = Path.Combine(exeDir, ".chispa-profile");

            string[] browserPaths = new string[]
            {
                @"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                @"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
                @"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                @"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
            };

            foreach (string path in browserPaths)
            {
                if (File.Exists(path))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = path,
                        Arguments = "--app=" + url + " --window-size=1440,900 --user-data-dir=\\"" + profileDir + "\\" --no-first-run --no-default-browser-check",
                        UseShellExecute = false
                    };
                    return Process.Start(psi);
                }
            }

            return Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }

        private static void ServeLoop(TcpListener listener)
        {
            while (true)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(_ => HandleClient(client));
                }
                catch
                {
                    break;
                }
            }
        }

        private static void HandleClient(TcpClient client)
        {
            try
            {
                using (client)
                using (NetworkStream stream = client.GetStream())
                using (StreamReader reader = new StreamReader(stream, Encoding.UTF8, false, 4096, true))
                {
                    string requestLine = reader.ReadLine();
                    if (string.IsNullOrEmpty(requestLine)) return;

                    string[] parts = requestLine.Split(' ');
                    if (parts.Length < 2) return;

                    string rawPath = Uri.UnescapeDataString(parts[1].Split('?')[0]);
                    if (rawPath == "/" || string.IsNullOrEmpty(rawPath))
                    {
                        rawPath = "/index.html";
                    }

                    string safeRel = rawPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                    string fullPath = Path.GetFullPath(Path.Combine(DistRoot, safeRel));

                    if (!fullPath.StartsWith(Path.GetFullPath(DistRoot), StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
                    {
                        byte[] notFound = Encoding.UTF8.GetBytes("HTTP/1.1 404 Not Found\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n");
                        stream.Write(notFound, 0, notFound.Length);
                        return;
                    }

                    byte[] body = File.ReadAllBytes(fullPath);
                    string mime = GetMimeType(Path.GetExtension(fullPath));
                    string header =
                        "HTTP/1.1 200 OK\\r\\n" +
                        "Content-Type: " + mime + "\\r\\n" +
                        "Content-Length: " + body.Length + "\\r\\n" +
                        "Cache-Control: no-cache\\r\\n" +
                        "Connection: close\\r\\n\\r\\n";

                    byte[] headerBytes = Encoding.UTF8.GetBytes(header);
                    stream.Write(headerBytes, 0, headerBytes.Length);
                    stream.Write(body, 0, body.Length);
                }
            }
            catch
            {
                // Ignore client disconnect
            }
        }

        private static string GetMimeType(string ext)
        {
            switch (ext.ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".webmanifest": return "application/manifest+json; charset=utf-8";
                case ".woff2": return "font/woff2";
                case ".woff": return "font/woff";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".ico": return "image/x-icon";
                default: return "application/octet-stream";
            }
        }
    }
}
`;

function buildWindowsExe(): void {
  const rootDir = process.cwd();
  const icoPath = resolve(rootDir, 'scripts', 'chispa.ico');
  const csPath = resolve(rootDir, 'scripts', 'Launcher.cs');
  const exePath = resolve(rootDir, 'CHISPA-Infinito.exe');

  console.log('1. Generating procedural Windows icon (scripts/chispa.ico)...');
  generateProceduralIcon(icoPath);

  console.log('2. Writing native C# desktop launcher (scripts/Launcher.cs)...');
  writeFileSync(csPath, CSHARP_SOURCE, 'utf-8');

  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (!existsSync(cscPath)) {
    throw new Error(`csc.exe not found at ${cscPath}`);
  }

  console.log('3. Compiling CHISPA-Infinito.exe via csc.exe...');
  execFileSync(
    cscPath,
    [
      '/nologo',
      '/target:winexe',
      '/optimize+',
      `/win32icon:${icoPath}`,
      `/out:${exePath}`,
      '/r:System.dll',
      '/r:System.Windows.Forms.dll',
      csPath,
    ],
    { stdio: 'inherit' }
  );

  console.log(`✓ Native executable created: ${exePath}`);

  // Also package a portable release folder + ZIP for easy distribution / GitHub Releases
  const releaseDir = resolve(rootDir, 'release');
  const portableDir = resolve(releaseDir, 'CHISPA-Infinito-Portable');
  const zipPath = resolve(releaseDir, 'CHISPA-Infinito-Windows-v1.0.0.zip');

  if (existsSync(portableDir)) {
    rmSync(portableDir, { recursive: true, force: true });
  }
  mkdirSync(portableDir, { recursive: true });
  cpSync(exePath, resolve(portableDir, 'CHISPA-Infinito.exe'));
  cpSync(resolve(rootDir, 'dist'), resolve(portableDir, 'dist'), { recursive: true });

  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path "${portableDir}\\*" -DestinationPath "${zipPath}" -Force`,
    ],
    { stdio: 'inherit' }
  );
  console.log(`✓ Portable Windows package created: ${zipPath}`);
}

buildWindowsExe();
