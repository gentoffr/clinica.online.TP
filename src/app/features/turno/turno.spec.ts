import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Turno } from './turno';

describe('Turno', () => {
  let component: Turno;
  let fixture: ComponentFixture<Turno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Turno]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Turno);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
