"use client"

import { useEffect } from "react"

export default function AppInitializer() {
  useEffect(() => {
    // We no longer need to initialize localStorage since we're using MongoDB
    // The database was already seeded with our initial data
    console.log("Application initialized with MongoDB Atlas database");
  }, []);

  return null;
} 