import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models';
import { BackupResultDto, BackupListDto } from '../../models/backup.model';

@Injectable({
  providedIn: 'root'
})
export class AdminBackupService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/admin/backup`;

  constructor(private http: HttpClient) {}

  triggerBackup(): Observable<ApiResponse<BackupResultDto>> {
    return this.http.post<ApiResponse<BackupResultDto>>(`${this.baseUrl}/trigger`, {});
  }

  listBackups(): Observable<ApiResponse<BackupListDto>> {
    return this.http.get<ApiResponse<BackupListDto>>(`${this.baseUrl}/list`);
  }

  downloadBackup(fileName: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/${fileName}`, { responseType: 'blob' });
  }
}
