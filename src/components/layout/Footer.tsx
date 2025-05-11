
import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img 
              src="/leofi.jpg" 
              alt="LeoFi" 
              className="h-10 w-auto" 
            />
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} LeoFi Prediction Markets. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-orange-400">
              Twitter
            </a>
            <a href="#" className="text-gray-400 hover:text-orange-400">
              Discord
            </a>
            <a href="#" className="text-gray-400 hover:text-orange-400">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
