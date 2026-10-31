import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isLeaderboard = location.pathname === '/leaderboard';

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-zinc-100 hover:text-white transition-colors text-sm sm:text-base">
          Mấy thằng óc cặc
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${isHome
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Trang chủ
          </Link>
          <Link
            to="/leaderboard"
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${isLeaderboard
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Bảng xếp hạng
          </Link>
        </nav>
      </div>
    </header>
  );
};
