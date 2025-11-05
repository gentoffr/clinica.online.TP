import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoTurnos } from './listado-turnos';

describe('ListadoTurnos', () => {
  let component: ListadoTurnos;
  let fixture: ComponentFixture<ListadoTurnos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoTurnos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoTurnos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
