import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { Pet } from './pet.entity';
import { PetImage } from './pet-image.entity';
import { PetVaccination } from './pet-vaccination.entity';
import { VaccinationsService } from './vaccinations.service';
import { VaccinationsController } from './vaccinations.controller';
import { PetWeight } from './pet-weight.entity';
import { WeightsService } from './weights.service';
import { WeightsController } from './weights.controller';
import { PetAllergy } from './pet-allergy.entity';
import { AllergiesService } from './allergies.service';
import { AllergiesController } from './allergies.controller';
import { PetMedication } from './pet-medication.entity';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { PetProfileService } from './pet-profile.service';
import { PetProfileController } from './pet-profile.controller';
import { PublicPetController } from './public-pet.controller';
import { PetMedicalRecord } from './pet-medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { PetDocument } from './pet-document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { VaccineReminderLog } from './vaccine-reminder.entity';
import { VaccinationRemindersService } from './vaccination-reminders.service';
import { VaccinationRemindersController } from './vaccination-reminders.controller';
import { PetContextService } from './pet-context.service';
import { PetAiConsentController } from './pet-ai-consent.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pet,
      PetImage,
      PetVaccination,
      PetWeight,
      PetAllergy,
      PetMedication,
      PetMedicalRecord,
      PetDocument,
      VaccineReminderLog,
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    PetsController,
    VaccinationsController,
    WeightsController,
    AllergiesController,
    MedicationsController,
    PetProfileController,
    PublicPetController,
    PetAiConsentController,
    MedicalRecordsController,
    DocumentsController,
    VaccinationRemindersController,
  ],
  providers: [
    PetsService,
    VaccinationsService,
    WeightsService,
    AllergiesService,
    MedicationsService,
    PetProfileService,
    PetContextService,
    MedicalRecordsService,
    DocumentsService,
    VaccinationRemindersService,
  ],
  exports: [PetsService, PetContextService],
})
export class PetsModule {}
