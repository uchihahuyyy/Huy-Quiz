import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink, Terminal } from 'lucide-react';

export const ConfigBanner: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const envTemplate = `VITE_SUPABASE_URL=https://your-project-id.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-public-key`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto mb-8 p-5 rounded-2xl bg-dc-card border border-dc-yellow/40 shadow-dc-modal text-left">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-dc-yellow/15 text-dc-yellow border border-dc-yellow/30 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-dc-yellow">
            Chưa kết nối Supabase Cloud Backend
          </h2>
          <p className="mt-1 text-xs text-dc-textNormal leading-relaxed">
            Ứng dụng cần Supabase để lưu điểm bảng xếp hạng và chống gian lận. Bạn chỉ mất 1 phút theo 3 bước sau:
          </p>

          <div className="mt-3.5 space-y-2.5 text-xs text-dc-textNormal">
            <div className="p-2.5 rounded-xl bg-dc-input border border-dc-border">
              <span className="font-bold text-dc-yellow">Bước 1:</span> Đăng nhập{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-dc-blurple hover:underline inline-flex items-center gap-1 font-semibold"
              >
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>{' '}
              và tạo một dự án miễn phí mới.
            </div>

            <div className="p-2.5 rounded-xl bg-dc-input border border-dc-border">
              <span className="font-bold text-dc-yellow">Bước 2:</span> Mở tab{' '}
              <span className="text-white font-bold">SQL Editor</span>, copy toàn bộ nội dung file{' '}
              <code className="bg-dc-chat px-1.5 py-0.5 rounded text-dc-blurple font-mono text-[11px]">
                supabase/migrations/001_init_quiz.sql
              </code>
              , dán vào và nhấn nút <span className="text-dc-green font-bold">Run</span>.
            </div>

            <div className="p-2.5 rounded-xl bg-dc-input border border-dc-border">
              <span className="font-bold text-dc-yellow">Bước 3:</span> Vào{' '}
              <span className="text-white font-bold">Project Settings &rarr; API</span>, copy{' '}
              <code className="text-[11px] bg-dc-chat px-1 py-0.5 rounded font-mono">Project URL</code> và{' '}
              <code className="text-[11px] bg-dc-chat px-1 py-0.5 rounded font-mono">anon public key</code> vào file{' '}
              <code className="text-[11px] bg-dc-chat px-1 py-0.5 rounded font-mono text-dc-yellow">.env</code>:
              
              <div className="mt-2 relative">
                <pre className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-dc-blurple overflow-x-auto border border-dc-border">
                  {envTemplate}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-dc-chat hover:bg-dc-elevated text-[11px] text-dc-textNormal flex items-center gap-1 border border-dc-border transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-dc-green" />
                      <span className="text-dc-green font-semibold">Đã copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-dc-textMuted font-mono">
            <Terminal className="w-3.5 h-3.5 text-dc-textChannel" />
            <span>Sau khi lưu file .env, khởi động lại dev server: <code>npm run dev</code>.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
