import { Routes } from '@angular/router';
import { HomeFeedComponent } from './features/home/home-feed.component';
import { PersonalArchiveComponent } from './features/archive/personal-archive.component';
import { registeredGuard } from './core/guards/registered.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeFeedComponent,
  },
  {
    path: 'my-archive',
    component: PersonalArchiveComponent,
    canActivate: [registeredGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
