import { Routes } from "@angular/router";

export const coreRoutes: Routes = [
    {path: "", redirectTo: "inicio", pathMatch: "full"},
    {path: "inicio", loadComponent: () => import("./auth/auth.host/auth.host").then(m => m.AuthHost)}
]
