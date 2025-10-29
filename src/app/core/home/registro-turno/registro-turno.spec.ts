import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroTurno } from './registro-turno';

describe('RegistroTurno', () => {
  let component: RegistroTurno;
  let fixture: ComponentFixture<RegistroTurno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroTurno]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroTurno);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
