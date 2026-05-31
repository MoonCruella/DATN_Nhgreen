import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll main window
    window.scrollTo(0, 0);
    
    // Scroll admin content area if exists
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
      adminContent.scrollTo(0, 0);
    }
    
    // Scroll manager content area if exists
    const managerContent = document.getElementById('manager-content');
    if (managerContent) {
      managerContent.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}