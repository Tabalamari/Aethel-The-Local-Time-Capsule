import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  LocationEntry,
  MediaFilterParams,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-location-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="p-5 rounded-xl border border-aethel-filter bg-aethel-surface space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-aethel-filter">
            Geolocation & Chronology
          </span>
          <h3 class="text-base font-serif text-aethel-cream">
            Sequential selection: Country → City → District and time filter
          </h3>
        </div>

        <div class="flex items-center gap-2">
          @if (hasActiveFilters()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="text-xs font-mono px-3 py-1.5 rounded border border-aethel-border text-aethel-muted hover:text-aethel-cream transition"
            >
              Reset Filters
            </button>
          }

          <button
            type="button"
            (click)="onToggleAddLocation()"
            class="text-xs font-mono px-3.5 py-1.5 rounded bg-aethel-bg border border-aethel-filter/60 text-aethel-filter hover:bg-aethel-filter hover:text-aethel-bg transition"
          >
            {{ showAddForm() ? '✕ Close Form' : '+ Add New District' }}
          </button>
        </div>
      </div>

      <!-- Cascading Dropdowns (Country -> City -> District) + Year/Month Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- 1. Country -->
        <div>
          <label class="block text-[11px] font-mono uppercase text-aethel-muted mb-1">
            1. Country
          </label>
          <select
            [ngModel]="selectedCountry()"
            (ngModelChange)="onCountryChange($event)"
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter"
          >
            <option value="">All Countries</option>
            @for (country of countries(); track country) {
              <option [value]="country">{{ country }}</option>
            }
          </select>
        </div>

        <!-- 2. City -->
        <div>
          <label class="block text-[11px] font-mono uppercase text-aethel-muted mb-1">
            2. City
          </label>
          <select
            [ngModel]="selectedCity()"
            (ngModelChange)="onCityChange($event)"
            [disabled]="!selectedCountry()"
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter disabled:opacity-40"
          >
            <option value="">All Cities</option>
            @for (city of citiesForCountry(); track city) {
              <option [value]="city">{{ city }}</option>
            }
          </select>
        </div>

        <!-- 3. District -->
        <div>
          <label class="block text-[11px] font-mono uppercase text-aethel-muted mb-1">
            3. District
          </label>
          <select
            [ngModel]="selectedLocationId()"
            (ngModelChange)="onDistrictChange($event)"
            [disabled]="!selectedCity()"
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter disabled:opacity-40"
          >
            <option value="">All Districts</option>
            @for (loc of districtsForCity(); track loc.id) {
              <option [value]="loc.id">{{ loc.district }}</option>
            }
          </select>
        </div>

        <!-- 4. Year Filter -->
        <div>
          <label class="block text-[11px] font-mono uppercase text-aethel-muted mb-1">
            Snapshot Year
          </label>
          <select
            [ngModel]="selectedYear()"
            (ngModelChange)="onYearChange($event)"
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter"
          >
            <option value="">All Years</option>
            @for (y of availableYears; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </div>

        <!-- 5. Month Filter -->
        <div>
          <label class="block text-[11px] font-mono uppercase text-aethel-muted mb-1">
            Month
          </label>
          <select
            [ngModel]="selectedMonth()"
            (ngModelChange)="onMonthChange($event)"
            [disabled]="!selectedYear()"
            class="w-full px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter disabled:opacity-40"
          >
            <option value="">All Months</option>
            @for (m of months; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Dynamic Location Creation Form -->
      @if (showAddForm()) {
        <form
          (ngSubmit)="onSubmitNewLocation()"
          class="pt-4 border-t border-aethel-border space-y-3"
        >
          <div class="text-xs font-mono text-aethel-gold">
            Adding new district to locations database (with duplicate protection):
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              name="newCountry"
              [(ngModel)]="newCountry"
              placeholder="Country (e.g., Ukraine)"
              required
              class="px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter"
            />
            <input
              type="text"
              name="newCity"
              [(ngModel)]="newCity"
              placeholder="City (e.g., Kyiv)"
              required
              class="px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter"
            />
            <input
              type="text"
              name="newDistrict"
              [(ngModel)]="newDistrict"
              placeholder="District (e.g., Vozdvyzhenka)"
              required
              class="px-3 py-2 rounded-lg bg-aethel-bg border border-aethel-border text-xs text-aethel-cream focus:outline-none focus:border-aethel-filter"
            />
          </div>

          <div class="flex items-center justify-between">
            @if (formFeedback()) {
              <span class="text-xs font-mono text-aethel-gold">{{ formFeedback() }}</span>
            } @else {
              <span></span>
            }

            <button
              type="submit"
              [disabled]="savingLocation()"
              class="px-4 py-2 rounded-lg bg-aethel-filter text-aethel-bg font-medium text-xs hover:bg-aethel-gold transition disabled:opacity-40"
            >
              {{ savingLocation() ? 'Saving...' : 'Save and Select District' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class LocationFilterBarComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly locationsList = signal<LocationEntry[]>([]);

  @Input() set locations(value: LocationEntry[]) {
    this.locationsList.set(value || []);
  }

  @Output() readonly filterChange = new EventEmitter<MediaFilterParams>();
  @Output() readonly locationAdded = new EventEmitter<LocationEntry>();

  readonly selectedCountry = signal<string>('');
  readonly selectedCity = signal<string>('');
  readonly selectedLocationId = signal<string>('');
  readonly selectedYear = signal<string>('');
  readonly selectedMonth = signal<string>('');

  readonly showAddForm = signal<boolean>(false);
  readonly savingLocation = signal<boolean>(false);
  readonly formFeedback = signal<string | null>(null);

  newCountry = 'Ukraine';
  newCity = '';
  newDistrict = '';

  readonly availableYears = ['2026', '2025', '2024', '2023'];
  readonly months = [
    { value: '01', label: '01 · January' },
    { value: '02', label: '02 · February' },
    { value: '03', label: '03 · March' },
    { value: '04', label: '04 · April' },
    { value: '05', label: '05 · May' },
    { value: '06', label: '06 · June' },
    { value: '07', label: '07 · July' },
    { value: '08', label: '08 · August' },
    { value: '09', label: '09 · September' },
    { value: '10', label: '10 · October' },
    { value: '11', label: '11 · November' },
    { value: '12', label: '12 · December' },
  ];

  readonly countries = computed(() => {
    const set = new Set(this.locationsList().map((l) => l.country));
    return Array.from(set).sort();
  });

  readonly citiesForCountry = computed(() => {
    const country = this.selectedCountry();
    if (!country) return [];
    const set = new Set(
      this.locationsList()
        .filter((l) => l.country === country)
        .map((l) => l.city)
    );
    return Array.from(set).sort();
  });

  readonly districtsForCity = computed(() => {
    const country = this.selectedCountry();
    const city = this.selectedCity();
    if (!country || !city) return [];
    return this.locationsList().filter((l) => l.country === country && l.city === city);
  });

  readonly hasActiveFilters = computed(() =>
    Boolean(
      this.selectedCountry() ||
        this.selectedCity() ||
        this.selectedLocationId() ||
        this.selectedYear() ||
        this.selectedMonth()
    )
  );

  onCountryChange(country: string): void {
    this.selectedCountry.set(country);
    this.selectedCity.set('');
    this.selectedLocationId.set('');
    this.emitFilters();
  }

  onCityChange(city: string): void {
    this.selectedCity.set(city);
    this.selectedLocationId.set('');
    this.emitFilters();
  }

  onDistrictChange(locationId: string): void {
    this.selectedLocationId.set(locationId);
    this.emitFilters();
  }

  onYearChange(year: string): void {
    this.selectedYear.set(year);
    if (!year) {
      this.selectedMonth.set('');
    }
    this.emitFilters();
  }

  onMonthChange(month: string): void {
    this.selectedMonth.set(month);
    this.emitFilters();
  }

  resetFilters(): void {
    this.selectedCountry.set('');
    this.selectedCity.set('');
    this.selectedLocationId.set('');
    this.selectedYear.set('');
    this.selectedMonth.set('');
    this.emitFilters();
  }

  onToggleAddLocation(): void {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal('Sign in to add new cities or districts to the time capsule map.');
      return;
    }
    this.showAddForm.update((v) => !v);
    this.formFeedback.set(null);
    if (this.selectedCountry()) this.newCountry = this.selectedCountry();
    if (this.selectedCity()) this.newCity = this.selectedCity();
  }

  onSubmitNewLocation(): void {
    if (!this.newCountry.trim() || !this.newCity.trim() || !this.newDistrict.trim()) {
      this.formFeedback.set('Fill in all three location fields.');
      return;
    }

    this.savingLocation.set(true);
    this.formFeedback.set(null);

    this.api
      .createLocation({
        country: this.newCountry,
        city: this.newCity,
        district: this.newDistrict,
      })
      .subscribe({
        next: (created) => {
          this.savingLocation.set(false);
          this.locationAdded.emit(created);
          this.selectedCountry.set(created.country);
          this.selectedCity.set(created.city);
          this.selectedLocationId.set(created.id);
          this.newDistrict = '';
          this.showAddForm.set(false);
          this.emitFilters();
        },
        error: (err) => {
          this.savingLocation.set(false);
          const existing = err?.error?.location as LocationEntry | undefined;
          if (existing) {
            this.selectedCountry.set(existing.country);
            this.selectedCity.set(existing.city);
            this.selectedLocationId.set(existing.id);
            this.showAddForm.set(false);
            this.emitFilters();
            return;
          }
          this.formFeedback.set(err?.error?.message || 'Failed to add location');
        },
      });
  }

  private emitFilters(): void {
    this.filterChange.emit({
      country: this.selectedCountry() || undefined,
      city: this.selectedCity() || undefined,
      location_id: this.selectedLocationId() || undefined,
      year: this.selectedYear() || undefined,
      month: this.selectedMonth() || undefined,
    });
  }
}

