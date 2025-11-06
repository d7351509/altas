import React from 'react';
import { MicIcon } from './IconComponents';

export const Header: React.FC = () => {
  return (
    <header className="bg-[#FFFCF9]/80 backdrop-blur-sm border-b border-[#F7E9DE] shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <div className="bg-[#FFC8DD] p-2 rounded-lg shadow">
           <MicIcon className="w-6 h-6 text-white"/>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#352F44] sm:text-3xl">
          會議小記
        </h1>
      </div>
    </header>
  );
};