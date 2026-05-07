import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { TourDetailsComponent } from './tour-details/tour-details.component';
import { TouristMyToursComponent } from './tourist-my-tours/tourist-my-tours.component';
import { TourKeyPointsComponent } from './tour-key-points/tour-key-points.component';
import { AuthInterceptor } from './services/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    AdminUsersComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ExploreToursComponent,
    FindToursComponent,
    FindUsersComponent,
    ProfileComponent,
    CreateTourComponent,
    MyToursComponent,
    PositionSimulatorComponent,
    TourKeyPointsComponent,
    ShoppingCartComponent,
    TouristMyToursComponent,
    TourDetailsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
