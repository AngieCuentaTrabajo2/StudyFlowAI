import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => ({
      Component: (await import("./pages/LandingPage")).default,
    }),
  },
  {
    path: "/login",
    lazy: async () => ({
      Component: (await import("./pages/LoginPage")).default,
    }),
  },
  {
    path: "/register",
    lazy: async () => ({
      Component: (await import("./pages/RegisterPage")).default,
    }),
  },
  {
    path: "/app",
    lazy: async () => ({
      Component: (await import("./components/DashboardLayout")).default,
    }),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("./pages/Dashboard")).default,
        }),
      },
      {
        path: "courses",
        lazy: async () => ({
          Component: (await import("./pages/Courses")).default,
        }),
      },
      {
        path: "courses/:courseId",
        lazy: async () => ({
          Component: (await import("./pages/CourseDetail")).default,
        }),
      },
      {
        path: "tasks",
        lazy: async () => ({
          Component: (await import("./pages/Tasks")).default,
        }),
      },
      {
        path: "exams",
        lazy: async () => ({
          Component: (await import("./pages/Exams")).default,
        }),
      },
      {
        path: "planner",
        lazy: async () => ({
          Component: (await import("./pages/Planner")).default,
        }),
      },
      {
        path: "assistant",
        lazy: async () => ({
          Component: (await import("./pages/AIAssistant")).default,
        }),
      },
      {
        path: "progress",
        lazy: async () => ({
          Component: (await import("./pages/Progress")).default,
        }),
      },
      {
        path: "notifications",
        lazy: async () => ({
          Component: (await import("./pages/Notifications")).default,
        }),
      },
      {
        path: "settings",
        lazy: async () => ({
          Component: (await import("./pages/Settings")).default,
        }),
      },
    ],
  },
]);
