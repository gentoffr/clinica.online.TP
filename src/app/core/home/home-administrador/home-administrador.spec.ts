import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeAdministrador } from './home-administrador';

describe('HomeAdministrador', () => {
  let component: HomeAdministrador;
  let fixture: ComponentFixture<HomeAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAdministrador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeAdministrador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
