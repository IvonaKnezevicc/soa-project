import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminUsersComponent } from './admin-users/admin-users.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CreateTourComponent } from './create-tour/create-tour.component';
import { ExploreToursComponent } from './explore-tours/explore-tours.component';
import { FindToursComponent } from './find-tours/find-tours.component';
import { HomeComponent } from './home/home.component';
import { FindUsersComponent } from './find-users/find-users.component';
import { MyToursComponent } from './my-tours/my-tours.component';
import { PositionSimulatorComponent } from './position-simulator/position-simulator.component';
import { ProfileComponent } from './profile/profile.component';
import { ShoppingCartComponent } from './shopping-cart/shopping-cart.component';
import { TourKeyPointsComponent } from './tour-key-points/tour-key-points.component';
import { adminGuard } from './services/admin.guard';
import { authGuard } from './services/auth.guard';
import { guideGuard } from './services/guide.guard';
import { touristGuard } from './services/tourist.guard';

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
  { path: 'my-tours/:id/key-points', component: TourKeyPointsComponent, canActivate: [authGuard, guideGuard] },
  { path: 'find-tours', component: FindToursComponent, canActivate: [authGuard, touristGuard] },
  { path: 'tours', component: ExploreToursComponent, canActivate: [authGuard, touristGuard] },
  { path: 'shopping-cart', component: ShoppingCartComponent, canActivate: [authGuard, touristGuard] },
  { path: 'position-simulator', component: PositionSimulatorComponent, canActivate: [authGuard, touristGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
