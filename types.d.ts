declare module 'react-beautiful-dnd' {
  export const DragDropContext: any;
  export const Droppable: any;
  export const Draggable: any;
} 

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      sessionVersion: number;
      languagePreference?: "zh" | "en";
      isVerified?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: "user" | "admin";
    sessionVersion: number;
    languagePreference?: "zh" | "en";
    isVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "user" | "admin";
    sessionVersion?: number;
    languagePreference?: "zh" | "en";
    isVerified?: boolean;
  }
}