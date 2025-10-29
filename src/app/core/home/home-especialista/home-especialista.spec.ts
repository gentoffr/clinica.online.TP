import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeEspecialista } from './home-especialista';

describe('HomeEspecialista', () => {
  let component: HomeEspecialista;
  let fixture: ComponentFixture<HomeEspecialista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeEspecialista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeEspecialista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
