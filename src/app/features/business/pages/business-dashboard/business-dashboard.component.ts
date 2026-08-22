import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountsService } from '../../services/accounts.service';
import { Account } from '../../../../core/models/account.model';

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './business-dashboard.component.html',
  styleUrl: './business-dashboard.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BusinessDashboardComponent implements OnInit {
  private accountsService = inject(AccountsService);

  account = signal<Account | null>(null);
  loading = signal(true);

  get isPending()  { return this.account()?.status === 'pending'; }
  get isApproved() { return this.account()?.status === 'approved'; }
  get isRejected() { return this.account()?.status === 'rejected'; }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.account.set(await this.accountsService.getMyAccount());
    this.loading.set(false);
  }
}
