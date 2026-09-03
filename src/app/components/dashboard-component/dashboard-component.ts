import { Component, computed } from '@angular/core';
import { NavbarComponent } from '../../shared/navbar-component/navbar-component';
import { BaseChartDirective } from 'ng2-charts';
import { DecimalPipe } from '@angular/common';
import { InvoiceService } from '../../core/services/InvoiceService/invoice-service';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  imports: [NavbarComponent, BaseChartDirective, DecimalPipe],
  selector: 'app-dashboard-component',
  standalone: true,
  styleUrl: './dashboard-component.css',
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent {

  constructor(public store: InvoiceService) {}

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
  
  chartData = computed<ChartData<'pie'>>(() => {
    const porTipo = this.store.summary().facturadoPorTipo;
    return {
      labels: Object.keys(porTipo),
      datasets: [{
        data: Object.values(porTipo),
        backgroundColor: ['#2ba99b', '#f2c14e', '#e2574c']
      }]
    };
  });

  chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

}
