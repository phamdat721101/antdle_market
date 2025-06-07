
import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-muted text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img 
              src="/lovable-uploads/6f3a6f5a-5ffc-4057-940b-dd98966c1f00.png" 
              alt="Antdle" 
              className="h-10 w-auto" 
            />
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} Antdle Prediction Markets. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-primary">
              Twitter
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary">
              Discord
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
