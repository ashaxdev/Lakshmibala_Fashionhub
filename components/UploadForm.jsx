'use client';

import { useState } from 'react';

export default function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUrl(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'uploads'); // change per use case, e.g. 'avatars'

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={uploading} />

      {uploading && <p>Uploading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {url && (
        <div>
          <p>Uploaded successfully:</p>
          <a href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
    </div>
  );
}
