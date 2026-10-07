import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLog } from './admin-log';

describe('AdminLog', () => {
  let component: AdminLog;
  let fixture: ComponentFixture<AdminLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLog],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
