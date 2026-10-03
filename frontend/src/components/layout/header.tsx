"use client";

import React from "react";
import { Cpu } from "lucide-react";

interface HeaderProps {

}

export function Header({
  
}: HeaderProps) {
  return (
    <header className="h-0 backdrop-blur-md px-5 flex items-center justify-between z-10 transition-colors">
      {/* Left: Session Title & Agent Status Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 truncate">
        
        </div> 

        
      </div>

      
    </header>
  );
}

export default Header;
