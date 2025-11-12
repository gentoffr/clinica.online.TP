import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisPacientes } from './mis-pacientes';

describe('MisPacientes', () => {
  let component: MisPacientes;
  let fixture: ComponentFixture<MisPacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPacientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisPacientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
