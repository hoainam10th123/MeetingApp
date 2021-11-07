import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotfoundComponent } from './components/error-page/notfound/notfound.component';
import { ServerErrorComponent } from './components/error-page/server-error/server-error.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { RoomMeetingComponent } from './components/room/room-meeting/room-meeting.component';
import { PreventUnsavedChangesGuard } from './_guards/prevent-unsaved-changes.guard';

const routes: Routes = [
  {path: 'home/:id', component: HomeComponent, canDeactivate: [PreventUnsavedChangesGuard]},
  {path: 'room', component: RoomMeetingComponent},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'not-found', component: NotfoundComponent},
  {path: 'server-error', component: ServerErrorComponent},
  {path: '**', component: NotfoundComponent, pathMatch:'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
