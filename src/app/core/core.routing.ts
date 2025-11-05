import { Routes } from "@angular/router";

export const coreRoutes: Routes = [
    {path: "", redirectTo: "inicio", pathMatch: "full"},
    {path: "inicio", loadComponent: () => import("./auth/auth.host/auth.host").then(m => m.AuthHost)},
    {path: "home-administrador", loadComponent: () => import("./home/home-administrador/home-administrador").then(m => m.HomeAdministrador)},
    {path: "home-paciente", loadComponent: () => import("./home/home-paciente/home-paciente").then(m => m.Homepaciente)},
    {path: "home-especialista", loadComponent: () => import("./home/home-especialista/home-especialista").then (m => m.HomeEspecialista)},
]
