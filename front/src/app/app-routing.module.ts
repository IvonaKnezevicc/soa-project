import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminUsersComponent } from './admin-users/admin-users.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { HomeComponent } from './home/home.component';
import { adminGuard } from './services/admin.guard';
import { authGuard } from './services/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
