import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminUsersComponent } from './admin-users/admin-users.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CreateTourComponent } from './create-tour/create-tour.component';
import { HomeComponent } from './home/home.component';
import { FindUsersComponent } from './find-users/find-users.component';
import { MyToursComponent } from './my-tours/my-tours.component';
import { ProfileComponent } from './profile/profile.component';
import { adminGuard } from './services/admin.guard';
import { authGuard } from './services/auth.guard';
import { guideGuard } from './services/guide.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'find-users', component: FindUsersComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
  { path: 'create-tour', component: CreateTourComponent, canActivate: [authGuard, guideGuard] },
  { path: 'my-tours', component: MyToursComponent, canActivate: [authGuard, guideGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
