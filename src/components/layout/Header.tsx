
import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from '../wallet/Wallet';

export const Header = () => {
  return (
    <header className="bg-gradient-to-r from-red-600 to-orange-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/public/lovable-uploads/c0644965-c636-4342-84e5-924e811e94f0.png" 
                alt="LeoFi" 
                className="h-12 w-auto mr-2" 
              />
              <span className="text-white text-3xl font-bold">LeoFi</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-8">
            <Link to="/markets" className="text-white hover:text-orange-100 transition-colors">
              Markets
            </Link>
            <Link to="/my-positions" className="text-white hover:text-orange-100 transition-colors">
              My Positions
            </Link>
            <Wallet />
          </nav>
        </div>
      </div>
    </header>
  );
};
