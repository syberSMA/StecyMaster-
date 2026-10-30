// File: api/download.js
import { Readable } from 'stream';

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL tidak valid" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil file dari target");

    // Ekstrak nama file dari URL asli
    let filename = url.split('/').pop().split('?')[0] || 'download_stecymaster.zip';
    if (!filename.includes('.')) filename += '.zip';

    // Memaksa browser mengunduh file (bukan menampilkan isinya di tab baru)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    
    // Pipe stream langsung ke response agar ringan di memori Vercel
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (error) {
    return res.status(500).json({ error: "Terjadi kesalahan saat memproses unduhan." });
  }
}
