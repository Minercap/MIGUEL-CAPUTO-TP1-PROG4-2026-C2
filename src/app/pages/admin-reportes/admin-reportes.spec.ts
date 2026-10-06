import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminReportes } from './admin-reportes';

describe('AdminReportes', () => {
  let component: AdminReportes;
  let fixture: ComponentFixture<AdminReportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReportes],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReportes);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
