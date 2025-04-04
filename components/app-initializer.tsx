"use client"

import { useEffect } from "react"
import { initializeMealsStorage } from "@/lib/utils"

export default function AppInitializer() {
  useEffect(() => {
    // Initialize meals storage with default data if not already present
    initializeMealsStorage();
  }, []);

  return null;
} 